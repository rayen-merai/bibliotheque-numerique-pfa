<?php
header("Content-Type: application/json; charset=utf-8");
include "connect.php";

$id          = intval($_POST['id']          ?? 0);
$titre       = strval($_POST['titre']       ?? '');
$auteur      = strval($_POST['auteur']      ?? '');
$categorie   = strval($_POST['categorie']   ?? '');
$description = strval($_POST['description'] ?? '');

if ($id <= 0 || empty($titre) || empty($auteur)) {
    http_response_code(400);
    die(json_encode(["success" => false, "message" => "Données invalides: id, titre et auteur requis."]));
}

$currentStmt = $connect->prepare("SELECT fichier, type_fichier FROM documents WHERE id = ?");
if (!$currentStmt) {
    http_response_code(500);
    die(json_encode(["success" => false, "message" => "Erreur préparation requête: " . $connect->error]));
}

$currentStmt->bind_param("i", $id);
if (!$currentStmt->execute()) {
    http_response_code(500);
    die(json_encode(["success" => false, "message" => "Erreur exécution requête: " . $currentStmt->error]));
}

$currentResult = $currentStmt->get_result();
$currentRow = $currentResult->fetch_assoc();

if (!$currentRow) {
    http_response_code(404);
    die(json_encode(["success" => false, "message" => "Document non trouvé."]));
}

$filename  = $currentRow['fichier']      ?? '';
$extension = $currentRow['type_fichier'] ?? '';

// Handle file replacement
if (isset($_FILES['fichier']) && $_FILES['fichier']['error'] !== UPLOAD_ERR_NO_FILE) {
    $file = $_FILES['fichier'];
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        die(json_encode(["success" => false, "message" => "Erreur lors de l'upload du fichier."]));
    }

    $newExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if ($newExt !== 'pdf' && $newExt !== 'epub') {
        http_response_code(400);
        die(json_encode(["success" => false, "message" => "Format non autorisé. Seuls PDF et ePub sont acceptés."]));
    }

    $newFilename = time() . "_" . preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file['name']));
    $uploadDir   = __DIR__ . "/uploads/";

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    if (!move_uploaded_file($file['tmp_name'], $uploadDir . $newFilename)) {
        http_response_code(500);
        die(json_encode(["success" => false, "message" => "Erreur lors de l'enregistrement du fichier."]));
    }

    // Delete old file if it exists
    if (!empty($filename) && file_exists($uploadDir . $filename)) {
        unlink($uploadDir . $filename);
    }

    $filename  = $newFilename;
    $extension = $newExt;
}

$stmt = $connect->prepare(
    "UPDATE documents SET titre=?, auteur=?, categorie=?, description=?, fichier=?, type_fichier=? WHERE id=?"
);

if (!$stmt) {
    http_response_code(500);
    die(json_encode(["success" => false, "message" => "Erreur préparation requête: " . $connect->error]));
}

$stmt->bind_param("ssssssi", $titre, $auteur, $categorie, $description, $filename, $extension, $id);

if (!$stmt->execute()) {
    http_response_code(500);
    die(json_encode(["success" => false, "message" => "Erreur mise à jour: " . $stmt->error]));
}

http_response_code(200);
echo json_encode([
    "success" => true,
    "message" => "Document modifié avec succès"
]);
?>
