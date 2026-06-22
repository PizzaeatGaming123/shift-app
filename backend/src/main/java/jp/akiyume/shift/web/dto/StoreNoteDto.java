package jp.akiyume.shift.web.dto;

import jp.akiyume.shift.domain.StoreNote;

public record StoreNoteDto(String date, String text) {
    public static StoreNoteDto from(StoreNote n) {
        return new StoreNoteDto(n.getDate().toString(), n.getText());
    }
}
