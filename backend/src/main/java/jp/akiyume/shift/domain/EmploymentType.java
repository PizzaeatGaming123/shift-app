package jp.akiyume.shift.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum EmploymentType {
    FULL_TIME("正社員"),
    PART_TIME("パート"),
    ARUBAITO("アルバイト");

    private final String label;

    EmploymentType(String label) {
        this.label = label;
    }

    @JsonValue
    public String getLabel() {
        return label;
    }
}
