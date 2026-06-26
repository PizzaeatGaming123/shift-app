package jp.akiyume.shift.web.dto;

import java.util.List;

/**
 * シフト割当の作成/更新リクエスト。
 * - tasks: チェックされたタスク名の配列。null は無変更ではなく「未指定（空）」として扱う。
 * - breaks: 休憩 (start,end) の配列。null は同上。
 * - workMemo: 100 文字程度のメモ。
 *
 * 既存クライアントから {storeId, date, slot, staffId, startTime, endTime} だけ送られても
 * Spring の JSON マッピングで残りは null になるので、サービス層は null を「未指定」として扱う。
 */
public record AssignmentBody(Long storeId, String date, String slot, Long staffId,
                             String startTime, String endTime,
                             List<String> tasks, List<BreakBody> breaks,
                             String workMemo) {

    public record BreakBody(String startTime, String endTime) {}
}
