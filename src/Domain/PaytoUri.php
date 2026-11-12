<?php

declare(strict_types=1);

namespace SepaPay\Domain;

/** RFC 8905 payto:// and legacy bank:// BezahlCode URIs. */
final class PaytoUri
{
    public function toPaytoUri(PaymentRequest $req): string
    {
        $path = 'payto://iban/' . rawurlencode($req->iban);
        $parts = [];

        if ($req->amount !== '') {
            // RFC 8905 Section 4: literal colon in amount=CURRENCY:VALUE
            $parts[] = 'amount=EUR:' . rawurlencode($req->amount);
        }

        if ($req->recipientName !== '') {
            $parts[] = 'receiver-name=' . rawurlencode($req->recipientName);
        }

        if ($req->reference !== '') {
            $parts[] = 'instruction=' . rawurlencode($req->reference);
        } elseif ($req->purpose !== '') {
            $parts[] = 'message=' . rawurlencode($req->purpose);
        }

        if ($parts === []) {
            return $path;
        }

        return $path . '?' . implode('&', $parts);
    }

    public function toBankUri(PaymentRequest $req): string
    {
        $params = [
            'name' => $req->recipientName,
            'iban' => $req->iban,
        ];

        if ($req->bic !== '') {
            $params['bic'] = $req->bic;
        }

        if ($req->amount !== '') {
            $parts = explode('.', $req->amount);
            $params['amount'] = ($parts[0] ?? '0') . ',' . ($parts[1] ?? '00');
        }

        if ($req->purpose !== '') {
            $params['reason'] = $req->purpose;
        }

        $filtered = array_filter($params, static fn (string $v): bool => $v !== '');

        $query = http_build_query($filtered, '', '&', PHP_QUERY_RFC3986);

        return 'bank://singlepaymentsepa?' . $query;
    }
}
