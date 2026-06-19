package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.Staff;

public record MeResponse(Long id, String name, String role, Long storeId) {
    public static MeResponse from(Staff staff) {
        return new MeResponse(staff.getId(), staff.getName(),
                staff.getRole().name(), staff.getStore().getId());
    }
}
