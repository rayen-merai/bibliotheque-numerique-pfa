<?php
header("Content-Type: application/json; charset=utf-8");
include "connect.php";

$id = intval($_GET['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    die(json_encode(["success" => false, "message" => "ID invalide."]));
}

$currentStmt = $connect->prepare("SELECT fichier FROM documents WHERE id = ?");
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

$filename = $currentRow['fichier'] ?? '';

$stmt = $connect->prepare("DELETE FROM documents WHERE id = ?");
if (!$stmt) {
    http_response_code(500);
    die(json_encode(["success" => false, "message" => "Erreur préparation requête: " . $connect->error]));
}

$stmt->bind_param("i", $id);

if (!$stmt->execute()) {
    http_response_code(500);
    die(json_encode(["success" => false, "message" => "Erreur suppression: " . $stmt->error]));
}

// Delete file from uploads
if (!empty($filename)) {
    $uploadDir = __DIR__ . "/uploads/";
    $filePath  = $uploadDir . $filename;
    if (file_exists($filePath)) {
        if (!unlink($filePath)) {
            error_log("Failed to delete file: " . $filePath);
        }
    }
}

http_response_code(200);
echo json_encode([
    "success" => true,
    "message" => "Document supprimé avec succès"
]);
?>
