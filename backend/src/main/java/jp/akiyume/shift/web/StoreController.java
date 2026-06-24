package jp.akiyume.shift.web;

import jp.akiyume.shift.repo.StaffRepository;
import jp.akiyume.shift.repo.StoreRepository;
import jp.akiyume.shift.repo.service.StaffService;
import jp.akiyume.shift.security.StoreAccessGuard;
import jp.akiyume.shift.web.dto.CreateStaffBody;
import jp.akiyume.shift.web.dto.StaffDto;
import jp.akiyume.shift.web.dto.StoreDto;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreRepository storeRepository;
    private final StaffRepository staffRepository;
    private final StaffService staffService;
    private final StoreAccessGuard guard;

    public StoreController(StoreRepository storeRepository, StaffRepository staffRepository,
                           StaffService staffService, StoreAccessGuard guard) {
        this.storeRepository = storeRepository;
        this.staffRepository = staffRepository;
        this.staffService = staffService;
        this.guard = guard;
    }

    @GetMapping
    public List<StoreDto> stores() {
        return storeRepository.findAll().stream().map(StoreDto::from).toList();
    }

    @GetMapping("/{storeId}/staff")
    public List<StaffDto> staff(@PathVariable Long storeId, Authentication auth) {
        var self = guard.requireStoreAccess(auth, storeId);
        boolean isManager = self.getRole().name().equals("MANAGER");
        return staffRepository.findByStoreId(storeId).stream()
                .map(isManager ? StaffDto::forManager : StaffDto::forStaff)
                .toList();
    }

    @PostMapping("/{storeId}/staff")
    public StaffDto createStaff(@PathVariable Long storeId, @RequestBody CreateStaffBody body,
                                Authentication auth) {
        guard.requireStoreAccess(auth, storeId);
        return StaffDto.forManager(staffService.create(storeId, body.name(), body.employmentType(), body.role()));
    }
}
