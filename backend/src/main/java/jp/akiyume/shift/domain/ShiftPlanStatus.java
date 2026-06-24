package jp.akiyume.shift.domain;

/** AGENTS.md §必須機能9 に対応する 6 状態。 */
public enum ShiftPlanStatus {
    DRAFT,
    ADJUSTING,
    CONFIRMED,
    PUBLISHED,
    CHANGING,
    REPUBLISHED;

    public boolean isPublished() {
        return this == PUBLISHED || this == REPUBLISHED;
    }

    public boolean isConfirmedOrLater() {
        return this == CONFIRMED || this == PUBLISHED
                || this == CHANGING || this == REPUBLISHED;
    }
}
