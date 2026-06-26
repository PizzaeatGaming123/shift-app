package jp.akiyume.shift.web.dto;

public record AssignmentBody(Long storeId, String date, String slot, Long staffId,
                             String startTime, String endTime) {}
