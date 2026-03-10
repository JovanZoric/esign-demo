package com.esign.service;

import com.esign.config.StorageProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final StorageProperties storageProperties;
    private Path rootLocation;

    @PostConstruct
    public void init() {
        rootLocation = Paths.get(storageProperties.getLocation())
                .toAbsolutePath()
                .normalize();
        try {
            Files.createDirectories(rootLocation);
            log.info("Storage location initialized at: {}", rootLocation.toAbsolutePath());
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage location", e);
        }
    }

    public String store(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("Failed to store empty file");
            }

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            // Generate unique filename
            String filename = UUID.randomUUID().toString() + extension;
            Path destinationFile = rootLocation.resolve(filename)
                    .normalize();

            if (!destinationFile.startsWith(rootLocation)) {
                throw new RuntimeException("Cannot store file outside current directory");
            }

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            }

            log.info("File stored: {}", filename);
            return filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    public Path load(String filename) {
        Path resolvedPath = rootLocation.resolve(filename).normalize();
        if (!resolvedPath.startsWith(rootLocation)) {
            throw new RuntimeException("Cannot read file outside current directory");
        }
        return resolvedPath;
    }

    public Resource loadAsResource(String filename) {
        try {
            Path file = load(filename);
            Resource resource = new UrlResource(Objects.requireNonNull(file.toUri()));
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Could not read file: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Could not read file: " + filename, e);
        }
    }

    public void delete(String filename) {
        try {
            Path file = load(filename);
            Files.deleteIfExists(file);
            log.info("File deleted: {}", filename);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file: " + filename, e);
        }
    }

    public byte[] readFileBytes(String filename) {
        try {
            Path file = load(filename);
            return Files.readAllBytes(file);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file: " + filename, e);
        }
    }
}
