package jp.akiyume.shift.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum RequestSlot {
    EARLY("early"),
    LATE("late"),
    ANY("any"),
    OFF("off");

    private final String code;

    RequestSlot(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }
}
