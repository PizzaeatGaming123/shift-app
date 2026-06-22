package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.Recruitment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RecruitmentRepository extends JpaRepository<Recruitment, Long> {
    List<Recruitment> findByStore_IdAndDateBetween(Long storeId, LocalDate from, LocalDate to);
    Optional<Recruitment> findByStore_IdAndDate(Long storeId, LocalDate date);
}
