package jp.akiyume.shift.security;

import jp.akiyume.shift.domain.Staff;
import jp.akiyume.shift.repo.StaffRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class StaffUserDetailsService implements UserDetailsService {

    private final StaffRepository staffRepository;

    public StaffUserDetailsService(StaffRepository staffRepository) {
        this.staffRepository = staffRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Staff staff = staffRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(username));
        return User.withUsername(staff.getUsername())
                .password(staff.getPasswordHash())
                .authorities("ROLE_" + staff.getRole().name())
                .build();
    }
}
