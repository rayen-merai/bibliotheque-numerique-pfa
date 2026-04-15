<?php
include "connect.php";

$id          = intval($_POST['id']          ?? 0);
$titre       = strval($_POST['titre']       ?? '');
$auteur      = strval($_POST['auteur']      ?? '');
$categorie   = strval($_POST['categorie']   ?? '');
$description = strval($_POST['description'] ?? '');

if ($id <= 0 || empty($titre) || empty($auteur)) {
    http_response_code(400);
    die("Données invalides.");
}

$currentStmt = $connect->prepare("SELECT fichier, type_fichier FROM documents WHERE id = ?");
$currentStmt->bind_param("i", $id);
$currentStmt->execute();
$currentResult = $currentStmt->get_result();
$currentRow = $currentResult->fetch_assoc();

$filename  = $currentRow['fichier']      ?? '';
$extension = $currentRow['type_fichier'] ?? '';

if (isset($_FILES['fichier']) && $_FILES['fichier']['error'] !== UPLOAD_ERR_NO_FILE) {
    if ($_FILES['fichier']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        die("Erreur lors de l'upload du fichier.");
    }

    $file      = $_FILES['fichier'];
    $newExt    = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if ($newExt !== 'pdf' && $newExt !== 'epub') {
        http_response_code(400);
        die("Format non autorisé. Seuls PDF et ePub sont acceptés.");
    }

    $newFilename = time() . "_" . preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file['name']));
    $uploadDir   = __DIR__ . "/uploads/";

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    if (!move_uploaded_file($file['tmp_name'], $uploadDir . $newFilename)) {
        http_response_code(500);
        die("Erreur lors de l'upload du fichier.");
    }

    if (!empty($filename) && file_exists($uploadDir . $filename)) {
        unlink($uploadDir . $filename);
    }

    $filename  = $newFilename;
    $extension = $newExt;
}

$stmt = $connect->prepare(
    "UPDATE documents SET titre=?, auteur=?, categorie=?, description=?, fichier=?, type_fichier=? WHERE id=?"
);
$stmt->bind_param("ssssssi", $titre, $auteur, $categorie, $description, $filename, $extension, $id);

if ($stmt->execute()) {
    // Sync update to livres table
    $stmt2 = $connect->prepare(
        "UPDATE livres SET titre=?, auteur=? WHERE document_id=?"
    );
    $stmt2->bind_param("ssi", $titre, $auteur, $id);
    $stmt2->execute();

    echo "Document modifié avec succès";
} else {
    http_response_code(500);
    echo "Erreur: " . $connect->error;
}
?>
