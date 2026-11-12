<?php

declare(strict_types=1);

namespace SepaPay\Domain;

/**
 * Maps AT/DE national bank codes to display metadata and banking-app keys.
 */
final class BankDirectory
{
    public function __construct(
        private readonly IbanValidator $ibanValidator = new IbanValidator(),
    ) {
    }

    /**
     * @return array{country: string, bankCode: string, bankName: string, defaultBic: string, appKey: string}|null
     */
    public function resolveFromIban(string $iban): ?array
    {
        $normalized = $this->ibanValidator->normalize($iban);
        if (strlen($normalized) < 8) {
            return null;
        }

        $country = substr($normalized, 0, 2);
        return match ($country) {
            'AT' => $this->resolveAustria($normalized),
            'DE' => $this->resolveGermany($normalized),
            default => null,
        };
    }

    /**
     * @return array{country: string, bankCode: string, bankName: string, defaultBic: string, appKey: string}
     */
    private function resolveAustria(string $iban): array
    {
        $blz = substr($iban, 4, 5);
        $blzInt = (int) $blz;

        if ($blz === '20111') {
            return $this->entry('AT', $blz, 'Erste Bank und Sparkassen (George)', 'GIBAATWWXXX', 'george_at');
        }

        if ($blzInt >= 20100 && $blzInt <= 20999) {
            return $this->entry('AT', $blz, 'Österreichische Sparkassen (George)', 'GIBAATWWXXX', 'george_at');
        }

        if ($blzInt >= 32000 && $blzInt <= 39999) {
            return $this->entry('AT', $blz, 'Raiffeisenbankengruppe Österreich (Mein ELBA)', 'RZBAATWWXXX', 'elba_at');
        }

        if ($blzInt >= 11000 && $blzInt <= 12999) {
            return $this->entry('AT', $blz, 'UniCredit Bank Austria', 'BKAUATWWXXX', 'bankaustria_at');
        }

        if ($blzInt >= 14000 && $blzInt <= 14999) {
            return $this->entry('AT', $blz, 'BAWAG / easybank', 'BAWAATWWXXX', 'bawag_at');
        }

        if ($blz === '14200') {
            return $this->entry('AT', $blz, 'easybank', 'BAWAATWWXXX', 'bawag_at');
        }

        if ($blzInt >= 40000 && $blzInt <= 49999) {
            return $this->entry('AT', $blz, 'Volksbankengruppe Österreich', 'VBOEATWWXXX', 'volksbank_at');
        }

        if ($blzInt >= 15000 && $blzInt <= 15999) {
            return $this->entry('AT', $blz, 'Oberbank', 'OBKLAT2LXXX', 'oberbank_at');
        }

        if ($blzInt >= 17000 && $blzInt <= 17999) {
            return $this->entry('AT', $blz, 'BKS Bank', 'BFKKAT2KXXX', 'bks_at');
        }

        if ($blzInt >= 16000 && $blzInt <= 16999) {
            return $this->entry('AT', $blz, 'BTV', 'BTVAAT22XXX', 'btv_at');
        }

        if (in_array($blz, ['19120', '99000', '19200', '76040'], true)) {
            return $this->entry('AT', $blz, 'bank99', 'SPBAATWWXXX', 'bank99_at');
        }

        return $this->entry('AT', $blz, 'Bank in Österreich', '', 'generic_at');
    }

    /**
     * @return array{country: string, bankCode: string, bankName: string, defaultBic: string, appKey: string}
     */
    private function resolveGermany(string $iban): array
    {
        $blz = substr($iban, 4, 8);

        $specific = match ($blz) {
            '50010517' => $this->entry('DE', $blz, 'ING-DiBa', 'INGDDEFFXXX', 'ing_de'),
            '12030000' => $this->entry('DE', $blz, 'DKB Deutsche Kreditbank', 'BYLADEM1001', 'dkb_de'),
            '10011001' => $this->entry('DE', $blz, 'N26 Bank', 'NTSBDEB1XXX', 'n26_de'),
            '50024024' => $this->entry('DE', $blz, 'C24 Bank', 'DEUTDEFF502', 'c24_de'),
            '20041111', '20041133', '20041144', '20041155' => $this->entry('DE', $blz, 'comdirect', 'COBADEHDXXX', 'commerzbank_de'),
            default => null,
        };

        if ($specific !== null) {
            return $specific;
        }

        if (strlen($blz) < 4) {
            return $this->entry('DE', $blz, 'Bank in Deutschland', '', 'generic_de');
        }

        $groupDigit = $blz[3];
        return match ($groupDigit) {
            '5' => $this->entry('DE', $blz, 'Sparkassen-Finanzgruppe', '', 'sparkasse_de'),
            '9', '6' => $this->entry('DE', $blz, 'Volks- und Raiffeisenbanken', '', 'vr_de'),
            '7' => $this->entry('DE', $blz, 'Deutsche Bank Gruppe', 'DEUTDEFFXXX', 'deutschebank_de'),
            '4' => $this->entry('DE', $blz, 'Commerzbank Gruppe', 'COBADEFFXXX', 'commerzbank_de'),
            '1' => $this->entry('DE', $blz, 'Postbank / Deutsche Bank', 'PBNKDEFFXXX', 'deutschebank_de'),
            default => $this->entry('DE', $blz, 'Bank in Deutschland', '', 'generic_de'),
        };
    }

    /**
     * @return array{country: string, bankCode: string, bankName: string, defaultBic: string, appKey: string}
     */
    private function entry(
        string $country,
        string $bankCode,
        string $bankName,
        string $defaultBic,
        string $appKey,
    ): array {
        return [
            'country' => $country,
            'bankCode' => $bankCode,
            'bankName' => $bankName,
            'defaultBic' => $defaultBic,
            'appKey' => $appKey,
        ];
    }
}
