package jp.akiyume.shift.repo;

import jp.akiyume.shift.domain.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class StaffRepositoryTest {

    @Autowired StoreRepository storeRepository;
    @Autowired StaffRepository staffRepository;

    @Test
    void findByUsername_returnsStaff() {
        Store store = storeRepository.save(new Store("中島店"));
        staffRepository.save(new Staff("yamada", "hash", "山田", store,
                EmploymentType.FULL_TIME, Role.MANAGER));

        var found = staffRepository.findByUsername("yamada");

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("山田");
        assertThat(found.get().getRole()).isEqualTo(Role.MANAGER);
    }

    @Test
    void findByStoreId_returnsStoreStaff() {
        Store a = storeRepository.save(new Store("中島店"));
        Store b = storeRepository.save(new Store("新田店"));
        staffRepository.save(new Staff("u1", "h", "A", a, EmploymentType.PART_TIME, Role.STAFF));
        staffRepository.save(new Staff("u2", "h", "B", b, EmploymentType.PART_TIME, Role.STAFF));

        assertThat(staffRepository.findByStoreId(a.getId())).hasSize(1);
    }
}
