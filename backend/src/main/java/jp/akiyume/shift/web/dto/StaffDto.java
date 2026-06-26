package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.Staff;

public record StaffDto(Long id, String name, String employmentType, String role,
                       Integer hourlyWage, Integer monthlyHourLimit) {
    /** マネージャ閲覧用。時給を含めて返す。 */
    public static StaffDto forManager(Staff staff) {
        return new StaffDto(staff.getId(), staff.getName(),
                staff.getEmploymentType().getLabel(), staff.getRole().name(),
                staff.getHourlyWage(), staff.getMonthlyHourLimit());
    }

    /** 一般スタッフ閲覧用。給与単価は権限分離のため null にする。 */
    public static StaffDto forStaff(Staff staff) {
        return new StaffDto(staff.getId(), staff.getName(),
                staff.getEmploymentType().getLabel(), staff.getRole().name(),
                null, staff.getMonthlyHourLimit());
    }
}
