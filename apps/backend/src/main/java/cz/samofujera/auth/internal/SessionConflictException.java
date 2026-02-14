package cz.samofujera.auth.internal;

public class SessionConflictException extends RuntimeException {

    private final String device;
    private final String sessionId;

    public SessionConflictException(String device, String sessionId) {
        super("Session limit reached");
        this.device = device;
        this.sessionId = sessionId;
    }

    public String getDevice() {
        return device;
    }

    public String getSessionId() {
        return sessionId;
    }
}
