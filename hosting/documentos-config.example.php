<?php
// Copy to /home5/inmobi16/documentos-config.php, outside public_html.
return [
    'token' => 'REEMPLAZAR_CON_UN_SECRETO_ALEATORIO_DE_64_CARACTERES',
    'directory' => '/home5/inmobi16/documentos-privados',
    // Add only exact, trusted origins; never use a wildcard for vercel.app.
    'upload_origins' => [
        'https://intranet.inmobiliariaalbertoalfaro.com.pe',
    ],
];
