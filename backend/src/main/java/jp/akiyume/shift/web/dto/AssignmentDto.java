package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.ShiftAssignment;

public record AssignmentDto(String date, String slot, Long staffId,
                            String startTime, String endTime) {
    public static AssignmentDto from(ShiftAssignment a) {
        return new AssignmentDto(a.getDate().toString(), a.getSlot().getCode(), a.getStaff().getId(),
                a.getStartTime(), a.getEndTime());
    }
}
