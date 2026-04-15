<?php
include "connect.php";

$id = intval($_GET['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    die("ID invalide.");
}

$currentStmt = $connect->prepare("SELECT fichier FROM documents WHERE id = ?");
$currentStmt->bind_param("i", $id);
$currentStmt->execute();
$currentResult = $currentStmt->get_result();
$currentRow = $currentResult->fetch_assoc();
$filename = $currentRow['fichier'] ?? '';

$stmt = $connect->prepare("DELETE FROM documents WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    if (!empty($filename)) {
        $uploadDir = __DIR__ . "/uploads/";
        $filePath  = $uploadDir . $filename;
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }

    $livreStmt = $connect->prepare("DELETE FROM livres WHERE document_id = ?");
    $livreStmt->bind_param("i", $id);
    $livreStmt->execute();

    echo "Document supprimé";
} else {
    http_response_code(500);
    echo "Erreur: " . $connect->error;
}
?>
