package jp.akiyume.shift.repo.service;

import jp.akiyume.shift.domain.ShiftPlan;
import jp.akiyume.shift.domain.ShiftPlanStatus;
import jp.akiyume.shift.domain.Store;
import jp.akiyume.shift.repo.ShiftPlanRepository;
import jp.akiyume.shift.repo.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShiftPlanService {

    private final ShiftPlanRepository shiftPlanRepository;
    private final StoreRepository storeRepository;
    private final NotificationService notificationService;

    public ShiftPlanService(ShiftPlanRepository shiftPlanRepository,
                            StoreRepository storeRepository,
                            NotificationService notificationService) {
        this.shiftPlanRepository = shiftPlanRepository;
        this.storeRepository = storeRepository;
        this.notificationService = notificationService;
    }

    /** 該当店舗・月の計画。未作成なら DRAFT で作る。 */
    @Transactional
    public ShiftPlan getOrCreate(Long storeId, String month) {
        return shiftPlanRepository.findByStore_IdAndMonth(storeId, month)
                .orElseGet(() -> {
                    Store store = storeRepository.findById(storeId).orElseThrow();
                    return shiftPlanRepository.save(new ShiftPlan(store, month, ShiftPlanStatus.DRAFT));
                });
    }

    /** 状態を保存。次に許容しない遷移は弾く（DRAFT→PUBLISHED 直行は不可、確定 → 公開の順を強制）。 */
    @Transactional
    public ShiftPlan setStatus(Long storeId, String month, ShiftPlanStatus next) {
        ShiftPlan plan = getOrCreate(storeId, month);
        if (!isAllowedTransition(plan.getStatus(), next)) {
            throw new IllegalArgumentException(
                    "invalid transition: " + plan.getStatus() + " -> " + next);
        }
        plan.setStatus(next);
        ShiftPlan saved = shiftPlanRepository.save(plan);
        // 公開/再公開時は店舗の全スタッフへアプリ内通知を送る（§必須機能15）。
        if (next == ShiftPlanStatus.PUBLISHED) {
            notificationService.broadcastToStore(storeId, jp.akiyume.shift.domain.Notification.Kind.SHIFT_PUBLISHED,
                    month + " のシフトが公開されました。");
        } else if (next == ShiftPlanStatus.REPUBLISHED) {
            notificationService.broadcastToStore(storeId, jp.akiyume.shift.domain.Notification.Kind.SHIFT_REPUBLISHED,
                    month + " のシフトが再公開されました。");
        }
        return saved;
    }

    private static boolean isAllowedTransition(ShiftPlanStatus current, ShiftPlanStatus next) {
        if (current == next) return true;
        return switch (current) {
            case DRAFT -> next == ShiftPlanStatus.ADJUSTING || next == ShiftPlanStatus.CONFIRMED;
            case ADJUSTING -> next == ShiftPlanStatus.DRAFT || next == ShiftPlanStatus.CONFIRMED;
            case CONFIRMED -> next == ShiftPlanStatus.ADJUSTING || next == ShiftPlanStatus.PUBLISHED;
            case PUBLISHED -> next == ShiftPlanStatus.CHANGING;
            case CHANGING -> next == ShiftPlanStatus.REPUBLISHED || next == ShiftPlanStatus.PUBLISHED;
            case REPUBLISHED -> next == ShiftPlanStatus.CHANGING;
        };
    }
}
