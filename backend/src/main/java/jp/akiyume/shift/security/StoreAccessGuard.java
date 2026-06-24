package jp.akiyume.shift.security;

import jp.akiyume.shift.domain.Staff;
import jp.akiyume.shift.repo.StaffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class StoreAccessGuard {

    private final StaffRepository staffRepository;

    public StoreAccessGuard(StaffRepository staffRepository) {
        this.staffRepository = staffRepository;
    }

    public Staff requireSelf(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return staffRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    /** 自分の所属店舗以外の storeId を弾く。 */
    public Staff requireStoreAccess(Authentication auth, Long storeId) {
        Staff self = requireSelf(auth);
        if (storeId == null || !storeId.equals(self.getStore().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "cross-store access denied");
        }
        return self;
    }

    /** 指定スタッフが対象店舗に所属していることを確認する。 */
    public void requireStaffInStore(Long staffId, Long storeId) {
        if (staffId == null || storeId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "staffId/storeId required");
        }
        Staff target = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown staff"));
        if (!storeId.equals(target.getStore().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "staff is not in store");
        }
    }
}
