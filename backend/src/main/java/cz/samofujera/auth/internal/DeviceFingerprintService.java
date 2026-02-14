package cz.samofujera.auth.internal;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
class DeviceFingerprintService {

    String generate(HttpServletRequest request) {
        var ua = request.getHeader("User-Agent");
        var lang = request.getHeader("Accept-Language");
        var custom = request.getHeader("X-Device-Fingerprint");

        var raw = String.join("|",
            ua != null ? ua : "",
            lang != null ? lang : "",
            custom != null ? custom : ""
        );

        try {
            var digest = MessageDigest.getInstance("SHA-256");
            var hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 32);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    String extractDeviceName(HttpServletRequest request) {
        var ua = request.getHeader("User-Agent");
        if (ua == null) return "Unknown device";
        if (ua.contains("Chrome")) return "Chrome";
        if (ua.contains("Firefox")) return "Firefox";
        if (ua.contains("Safari")) return "Safari";
        if (ua.contains("Edge")) return "Edge";
        return "Unknown browser";
    }
}
