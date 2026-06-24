package jp.akiyume.shift.domain;

import jakarta.persistence.*;

import java.time.Instant;

/** AGENTS.md §必須機能15：スタッフへのアプリ内通知。 */
@Entity
@Table(name = "notifications")
public class Notification {

    public enum Kind {
        SHIFT_PUBLISHED, SHIFT_REPUBLISHED, ASSIGNMENT_CHANGED,
        REMINDER, RECRUITMENT, GENERIC
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "recipient_id")
    private Staff recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Kind kind;

    @Column(nullable = false, length = 200)
    private String message;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant readAt;

    protected Notification() {}

    public Notification(Staff recipient, Kind kind, String message) {
        this.recipient = recipient;
        this.kind = kind;
        this.message = message;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public Staff getRecipient() { return recipient; }
    public Kind getKind() { return kind; }
    public String getMessage() { return message; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getReadAt() { return readAt; }

    public void markRead() {
        if (readAt == null) this.readAt = Instant.now();
    }
}
