package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.ShiftRequest;

public record RequestDto(Long staffId, String date, String slot) {
    public static RequestDto from(ShiftRequest r) {
        return new RequestDto(r.getStaff().getId(), r.getDate().toString(), r.getSlot().getCode());
    }
}
