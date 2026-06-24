package jp.akiyume.shift.domain;

/** AGENTS.md §必須機能3 の希望シフト状態。 */
public enum RequestStatus {
    DRAFT,
    SUBMITTED,
    CHANGE_REQUESTED,
    CHANGE_APPROVED,
    CHANGE_REJECTED,
    CLOSED
}
