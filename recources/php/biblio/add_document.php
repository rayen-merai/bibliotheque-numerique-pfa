<?php
// MUST set header FIRST before any output
header("Content-Type: application/json; charset=utf-8");

// Include connection after header
include "connect.php";

$titre       = strval($_POST['titre']       ?? '');
$auteur      = strval($_POST['auteur']      ?? '');
$description = strval($_POST['description'] ?? '');
$categorie   = strval($_POST['categorie']   ?? '');

if (empty($titre) || empty($auteur) || empty($categorie)) {
    http_response_code(400);
    die(json_encode([
        "success" => false,
        "message" => "Champs obligatoires manquants: titre, auteur, categorie"
    ]));
}

if (!isset($_FILES['fichier'])) {
    http_response_code(400);
    die(json_encode([
        "success" => false,
        "message" => "Aucun fichier reçu. Veuillez sélectionner un fichier."
    ]));
}

$file = $_FILES['fichier'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    $errorMsg = "Erreur lors de l'upload du fichier";
    switch($file['error']) {
        case UPLOAD_ERR_NO_FILE:
            $errorMsg = "Aucun fichier sélectionné.";
            break;
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            $errorMsg = "Le fichier est trop volumineux (max 50MB).";
            break;
        case UPLOAD_ERR_PARTIAL:
            $errorMsg = "Le fichier n'a pas été complètement téléchargé.";
            break;
        case UPLOAD_ERR_NO_TMP_DIR:
            $errorMsg = "Dossier temporaire manquant.";
            break;
        case UPLOAD_ERR_CANT_WRITE:
            $errorMsg = "Impossible d'écrire le fichier sur le disque.";
            break;
        case UPLOAD_ERR_EXTENSION:
            $errorMsg = "Une extension PHP a arrêté l'upload.";
            break;
        default:
            $errorMsg = "Erreur inconnue lors de l'upload (code: " . $file['error'] . ")";
    }
    http_response_code(400);
    die(json_encode([
        "success" => false,
        "message" => $errorMsg
    ]));
}

$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if ($extension !== 'pdf' && $extension !== 'epub') {
    http_response_code(400);
    die(json_encode([
        "success" => false,
        "message" => "Format non autorisé. Seuls PDF et EPUB sont acceptés."
    ]));
}

$filename = time() . "_" . preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file['name']));
$uploadDir = __DIR__ . "/uploads/";

if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        die(json_encode([
            "success" => false,
            "message" => "Impossible de créer le dossier uploads."
        ]));
    }
}

if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
    http_response_code(500);
    die(json_encode([
        "success" => false,
        "message" => "Erreur lors de l'enregistrement du fichier sur le serveur."
    ]));
}

// Insert into documents table
$nb_exemplaires = 3;
$nb_empruntes = 0;

$stmt = $connect->prepare(
    "INSERT INTO documents (titre, auteur, description, categorie, fichier, type_fichier, nb_exemplaires, nb_empruntes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);

if (!$stmt) {
    http_response_code(500);
    die(json_encode([
        "success" => false,
        "message" => "Erreur préparation requête database."
    ]));
}

$stmt->bind_param("ssssssii", $titre, $auteur, $description, $categorie, $filename, $extension, $nb_exemplaires, $nb_empruntes);

if (!$stmt->execute()) {
    http_response_code(500);
    die(json_encode([
        "success" => false,
        "message" => "Erreur insertion base de données."
    ]));
}

$document_id = $connect->insert_id;
$stmt->close();

http_response_code(201);
echo json_encode([
    "success" => true,
    "id" => $document_id,
    "message" => "Document ajouté avec succès",
    "fichier" => $filename,
    "type_fichier" => $extension
]);
?>
