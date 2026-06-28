package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.Recruitment;

public record RecruitmentDto(String date, String message) {
    public static RecruitmentDto from(Recruitment r) {
        return new RecruitmentDto(r.getDate().toString(), r.getMessage());
    }
}
