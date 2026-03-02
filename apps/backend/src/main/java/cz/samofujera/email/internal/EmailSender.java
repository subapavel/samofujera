package cz.samofujera.email.internal;

public interface EmailSender {
    void send(String to, String subject, String html);
}
