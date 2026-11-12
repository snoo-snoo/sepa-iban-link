<?php

declare(strict_types=1);

namespace SepaPay\Domain;

use InvalidArgumentException;

/** EPC069-12 (STUZZA-QR / GiroCode) payload builder. Max 331 UTF-8 bytes. */
final class EpcQrPayload
{
    private const MAX_BYTES = 331;

    public function build(PaymentRequest $req): string
    {
        $bic = $req->bic;
        $amountLine = $req->amount !== '' ? 'EUR' . $req->amount : '';
        $reference = $req->reference;
        $purpose = $req->purpose;

        $lines = [
            'BCD',
            '002',
            '1',
            'SCT',
            $bic,
            $req->recipientName,
            $req->iban,
            $amountLine,
            '',
            $reference,
            $purpose,
        ];

        $payload = implode("\n", $lines);

        if (strlen($payload) > self::MAX_BYTES) {
            throw new InvalidArgumentException(
                'EPC-QR-Payload überschreitet das Limit von 331 Byte (EPC069-12). Bitte Texte kürzen.'
            );
        }

        return $payload;
    }
}
