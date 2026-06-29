package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.ShiftRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

public interface ShiftRequestRepository extends JpaRepository<ShiftRequest, Long> {
    List<ShiftRequest> findByStaff_Store_IdAndDateBetween(Long storeId, LocalDate from, LocalDate to);
    List<ShiftRequest> findByStaff_IdAndDate(Long staffId, LocalDate date);
    void deleteByStaff_IdAndDate(Long staffId, LocalDate date);

    /** 既存 DRAFT 希望を一括 SUBMITTED に揃える（デモ用シードでの提出状態正規化）。 */
    @Modifying
    @Transactional
    @Query("update ShiftRequest r set r.status = jp.akiyume.shift.domain.RequestStatus.SUBMITTED "
            + "where r.status = jp.akiyume.shift.domain.RequestStatus.DRAFT")
    int markAllDraftAsSubmitted();
}
