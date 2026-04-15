<?php
    header("Content-Type: application/json");
    include "connect.php";

    $categorie = isset($_GET['categorie']) ? strval($_GET['categorie']) : "";

    if ($categorie !== "") {
        $stmt = $connect->prepare("SELECT * FROM documents WHERE categorie = ? ORDER BY date_ajout DESC");
        $stmt->bind_param("s", $categorie);
    } else {
        $stmt = $connect->prepare("SELECT * FROM documents ORDER BY date_ajout DESC");
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $docs = [];
    while ($row = $result->fetch_assoc()) {
        $docs[] = $row;
    }

    echo json_encode($docs);
?>
