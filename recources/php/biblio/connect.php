<?php
// Database connection - NO OUTPUT BEFORE JSON HEADER
$connect = new mysqli("localhost", "root", "", "bibliotheque");

if ($connect->connect_error) {
    http_response_code(500);
    header("Content-Type: application/json; charset=utf-8");
    die(json_encode([
        "success" => false,
        "message" => "Erreur de connexion à la base de données: " . $connect->connect_error
    ]));
}

// Set charset
$connect->set_charset("utf8mb4");
?>
