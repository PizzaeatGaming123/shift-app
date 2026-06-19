package jp.akiyume.shift.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum WorkSlot {
    EARLY("early"),
    LATE("late");

    private final String code;

    WorkSlot(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    public static WorkSlot fromCode(String code) {
        for (WorkSlot s : values()) {
            if (s.code.equals(code)) return s;
        }
        throw new IllegalArgumentException("Unknown work slot: " + code);
    }
}
