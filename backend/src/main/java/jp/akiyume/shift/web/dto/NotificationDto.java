package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.Notification;

import java.time.Instant;

public record NotificationDto(Long id, String kind, String message,
                              Instant createdAt, Instant readAt) {
    public static NotificationDto from(Notification n) {
        return new NotificationDto(n.getId(), n.getKind().name(), n.getMessage(),
                n.getCreatedAt(), n.getReadAt());
    }
}
