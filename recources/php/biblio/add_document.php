<?php
include "connect.php";

$titre       = strval($_POST['titre']       ?? '');
$auteur      = strval($_POST['auteur']      ?? '');
$description = strval($_POST['description'] ?? '');
$categorie   = strval($_POST['categorie']   ?? '');

if (empty($titre) || empty($auteur) || empty($categorie)) {
    http_response_code(400);
    die("Champs obligatoires manquants.");
}

if (!isset($_FILES['fichier']) || $_FILES['fichier']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    die("Veuillez télécharger un fichier PDF ou ePub.");
}

$file      = $_FILES['fichier'];
$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if ($extension !== 'pdf' && $extension !== 'epub') {
    http_response_code(400);
    die("Format non autorisé. Seuls PDF et ePub sont acceptés.");
}

$filename = time() . "_" . preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file['name']));
$uploadDir = __DIR__ . "/uploads/";

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
    http_response_code(500);
    die("Erreur lors de l'upload du fichier.");
}

$stmt = $connect->prepare(
    "INSERT INTO documents (titre, auteur, description, categorie, fichier, type_fichier)
     VALUES (?, ?, ?, ?, ?, ?)"
);
$stmt->bind_param("ssssss", $titre, $auteur, $description, $categorie, $filename, $extension);

if ($stmt->execute()) {
    $document_id = $connect->insert_id;

    // Sync to livres table
    $stmt2 = $connect->prepare(
        "INSERT INTO livres (titre, auteur, annee, stock_total, stock_disponible, document_id)
         VALUES (?, ?, NULL, 1, 1, ?)"
    );
    $stmt2->bind_param("ssi", $titre, $auteur, $document_id);
    $stmt2->execute();

    echo "Document ajouté avec succès";
} else {
    http_response_code(500);
    echo "Erreur: " . $connect->error;
}
?>
