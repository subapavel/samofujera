package cz.samofujera.auth.internal;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class SessionTrackingService {

    private static final int MAX_SESSIONS = 3;

    private final UserSessionRepository sessionRepository;
    private final DeviceFingerprintService fingerprintService;
    @SuppressWarnings("rawtypes")
    private final Optional<org.springframework.session.SessionRepository> springSessionRepository;

    @SuppressWarnings("rawtypes")
    SessionTrackingService(UserSessionRepository sessionRepository,
                           DeviceFingerprintService fingerprintService,
                           Optional<org.springframework.session.SessionRepository> springSessionRepository) {
        this.sessionRepository = sessionRepository;
        this.fingerprintService = fingerprintService;
        this.springSessionRepository = springSessionRepository;
    }

    public SessionCheckResult checkAndTrack(UUID userId, HttpServletRequest request, boolean force) {
        int activeCount = sessionRepository.countByUser(userId);

        if (activeCount >= MAX_SESSIONS && !force) {
            var sessions = sessionRepository.findByUser(userId);
            var oldest = sessions.getLast();
            return new SessionCheckResult(true, oldest.deviceName(), oldest.sessionId());
        }

        if (activeCount >= MAX_SESSIONS && force) {
            var oldestId = sessionRepository.findOldestSessionId(userId);
            if (oldestId != null) {
                springSessionRepository.ifPresent(repo -> repo.deleteById(oldestId));
                sessionRepository.delete(oldestId);
            }
        }

        var fingerprint = fingerprintService.generate(request);
        var deviceName = fingerprintService.extractDeviceName(request);
        var ip = request.getRemoteAddr();
        var sessionId = request.getSession().getId();

        sessionRepository.create(sessionId, userId, fingerprint, deviceName, ip);

        return new SessionCheckResult(false, null, null);
    }

    public record SessionCheckResult(boolean conflict, String existingDevice, String sessionId) {}
}
