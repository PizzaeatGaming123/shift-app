package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.ShiftChangeHistory;

import java.time.Instant;

public record ShiftChangeDto(Long id, String date, String slot, Long staffId, String staffName,
                             String action, String changedBy, Instant changedAt,
                             String reason, boolean acknowledged) {
    public static ShiftChangeDto from(ShiftChangeHistory h) {
        return new ShiftChangeDto(h.getId(), h.getDate().toString(), h.getSlot().getCode(),
                h.getStaff().getId(), h.getStaff().getName(),
                h.getAction().name(), h.getChangedBy(), h.getChangedAt(),
                h.getReason(), h.isAcknowledged());
    }
}
