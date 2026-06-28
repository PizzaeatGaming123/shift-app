package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.DayNote;

public record DayNoteDto(Long staffId, String date, String text) {
    public static DayNoteDto from(DayNote n) {
        return new DayNoteDto(n.getStaff().getId(), n.getDate().toString(), n.getText());
    }
}
