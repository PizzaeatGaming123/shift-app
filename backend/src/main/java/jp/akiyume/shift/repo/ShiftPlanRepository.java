package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.ShiftPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShiftPlanRepository extends JpaRepository<ShiftPlan, Long> {
    Optional<ShiftPlan> findByStore_IdAndMonth(Long storeId, String month);
}
