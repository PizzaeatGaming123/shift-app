package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.Staff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff, Long> {
    Optional<Staff> findByUsername(String username);
    List<Staff> findByStoreId(Long storeId);
}
