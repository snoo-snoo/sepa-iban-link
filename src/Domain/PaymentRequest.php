<?php

declare(strict_types=1);

namespace SepaPay\Domain;

use InvalidArgumentException;

final readonly class PaymentRequest
{
    public function __construct(
        public string $recipientName,
        public string $iban,
        public string $bic = '',
        public string $amount = '',
        public string $purpose = '',
        public string $reference = '',
        public bool $verified = false,
    ) {
    }

  private function validator(): IbanValidator
    {
        return new IbanValidator();
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data, bool $verified = false): self
    {
        $v = new IbanValidator();

        $name = self::sanitizeName((string) ($data['recipientName'] ?? $data['name'] ?? $data['n'] ?? ''));
        if ($name === '' || mb_strlen($name) > 70) {
            throw new InvalidArgumentException('Empfängername ist ungültig (1–70 Zeichen).');
        }

        $ibanRaw = (string) ($data['iban'] ?? $data['i'] ?? '');
        $iban = $v->normalize($ibanRaw);
        if (!$v->isValid($iban)) {
            throw new InvalidArgumentException('IBAN ist ungültig.');
        }

        $bic = $v->normalizeBic((string) ($data['bic'] ?? $data['b'] ?? ''));
        if (!$v->isValidBic($bic)) {
            throw new InvalidArgumentException('BIC ist ungültig.');
        }

        $amount = self::parseAmount((string) ($data['amount'] ?? $data['a'] ?? ''));
        $purpose = self::sanitizeLine((string) ($data['purpose'] ?? $data['p'] ?? ''), 140);
        $reference = self::sanitizeLine((string) ($data['reference'] ?? $data['r'] ?? ''), 35);

        if ($purpose !== '' && $reference !== '') {
            throw new InvalidArgumentException('Verwendungszweck und strukturierte Referenz dürfen nicht beide gesetzt sein.');
        }

        if ($reference !== '' && str_starts_with(strtoupper(preg_replace('/\s+/', '', $reference) ?? ''), 'RF')) {
            self::validateRfReference($reference);
        }

        return new self($name, $iban, $bic, $amount, $purpose, $reference, $verified);
    }

    public function ibanFormatted(): string
    {
        return $this->validator()->format($this->iban);
    }

    public function ibanMasked(): string
    {
        return $this->validator()->mask($this->iban);
    }

    public function amountFormattedDe(): string
    {
        if ($this->amount === '') {
            return '';
        }

        $parts = explode('.', $this->amount);
        $euros = $parts[0];
        $cents = $parts[1] ?? '00';

        return $euros . ',' . $cents . ' €';
    }

    /** @return array<string, mixed> */
    public function toCompactArray(): array
    {
        return [
            'n' => $this->recipientName,
            'i' => $this->iban,
            'b' => $this->bic,
            'a' => $this->amount,
            'p' => $this->purpose,
            'r' => $this->reference,
        ];
    }

  private static function sanitizeName(string $name): string
    {
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', trim($name)) ?? '';

        return $name;
    }

  private static function sanitizeLine(string $line, int $maxLen): string
    {
        $line = preg_replace('/[\x00-\x1F\x7F]/u', ' ', trim($line)) ?? '';
        $line = preg_replace('/\s+/u', ' ', $line) ?? '';

        if (mb_strlen($line) > $maxLen) {
            $line = mb_substr($line, 0, $maxLen);
        }

        return $line;
    }

  private static function parseAmount(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return '';
        }

        $normalized = str_replace(' ', '', $raw);
        if (str_contains($normalized, ',') && str_contains($normalized, '.')) {
            if (strrpos($normalized, ',') > strrpos($normalized, '.')) {
                $normalized = str_replace('.', '', $normalized);
                $normalized = str_replace(',', '.', $normalized);
            } else {
                $normalized = str_replace(',', '', $normalized);
            }
        } elseif (str_contains($normalized, ',')) {
            $normalized = str_replace(',', '.', $normalized);
        }

        if (!is_numeric($normalized)) {
            throw new InvalidArgumentException('Betrag ist ungültig.');
        }

        $value = round((float) $normalized, 2);
        if ($value < 0.01 || $value > 999999999.99) {
            throw new InvalidArgumentException('Betrag muss zwischen 0,01 und 999.999.999,99 liegen.');
        }

        return number_format($value, 2, '.', '');
    }

  private static function validateRfReference(string $reference): void
    {
        $ref = strtoupper(preg_replace('/\s+/', '', $reference) ?? '');
        if (preg_match('/^RF\d{2}[A-Z0-9]{1,21}$/', $ref) !== 1) {
            throw new InvalidArgumentException('RF-Referenz: ungültiges Format (ISO 11649).');
        }

        $check = substr($ref, 0, 4);
        $payload = substr($ref, 4);
        $rearranged = $payload . $check;
        $numeric = '';
        foreach (str_split($rearranged) as $ch) {
            if (ctype_digit($ch)) {
                $numeric .= $ch;
            } else {
                $numeric .= (string) (ord($ch) - 55);
            }
        }

        $remainder = 0;
        $chunkSize = 9;
        $offset = 0;
        $totalLen = strlen($numeric);
        while ($offset < $totalLen) {
            $chunk = (string) $remainder . substr($numeric, $offset, $chunkSize);
            $remainder = (int) ($chunk % 97);
            $offset += $chunkSize;
        }

        if ($remainder !== 1) {
            throw new InvalidArgumentException('RF-Referenz: Prüfziffer ungültig (ISO 11649).');
        }
    }
}
