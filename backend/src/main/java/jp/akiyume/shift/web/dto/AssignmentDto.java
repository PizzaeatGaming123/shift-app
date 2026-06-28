package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.ShiftAssignment;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public record AssignmentDto(String date, String slot, Long staffId,
                            String startTime, String endTime,
                            List<String> tasks, List<BreakDto> breaks,
                            String workMemo) {

    public record BreakDto(String startTime, String endTime) {}

    public static AssignmentDto from(ShiftAssignment a) {
        List<String> tasksList;
        if (a.getTasks() == null || a.getTasks().isBlank()) {
            tasksList = Collections.emptyList();
        } else {
            tasksList = Arrays.stream(a.getTasks().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
        List<BreakDto> breaks = a.getBreaks().stream()
                .map(b -> new BreakDto(b.getStartTime(), b.getEndTime()))
                .toList();
        return new AssignmentDto(a.getDate().toString(), a.getSlot().getCode(), a.getStaff().getId(),
                a.getStartTime(), a.getEndTime(),
                tasksList, breaks, a.getWorkMemo());
    }
}
