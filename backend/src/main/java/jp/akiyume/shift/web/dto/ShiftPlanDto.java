package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.ShiftPlan;

import java.time.Instant;

public record ShiftPlanDto(Long storeId, String month, String status,
                           Instant createdAt, Instant updatedAt) {
    public static ShiftPlanDto from(ShiftPlan plan) {
        return new ShiftPlanDto(plan.getStore().getId(), plan.getMonth(),
                plan.getStatus().name(), plan.getCreatedAt(), plan.getUpdatedAt());
    }
}
