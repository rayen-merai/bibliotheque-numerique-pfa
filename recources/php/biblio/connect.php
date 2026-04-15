<?php
    $connect = new mysqli("localhost", "root", "", "bibliotheque");

    if ($connect->connect_error) {
        http_response_code(500);
        die("Connexion échouée: " . $connect->connect_error);
    }
?>
