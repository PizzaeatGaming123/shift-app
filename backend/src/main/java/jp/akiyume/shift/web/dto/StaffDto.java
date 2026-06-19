package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.Staff;

public record StaffDto(Long id, String name, String employmentType, String role) {
    public static StaffDto from(Staff staff) {
        return new StaffDto(staff.getId(), staff.getName(),
                staff.getEmploymentType().getLabel(), staff.getRole().name());
    }
}
