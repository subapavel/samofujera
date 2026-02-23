package cz.samofujera.user;

import cz.samofujera.shared.exception.NotFoundException;
import cz.samofujera.user.internal.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserDtos.ProfileResponse getProfile(UUID userId) {
        var user = userRepository.findById(userId);
        if (user == null) throw new NotFoundException("User not found");
        return new UserDtos.ProfileResponse(
            user.id(), user.email(), user.name(),
            user.role(), user.locale(), user.avatarUrl()
        );
    }

    public UserDtos.ProfileResponse updateProfile(UUID userId, UserDtos.UpdateProfileRequest request) {
        userRepository.updateProfile(userId, request.name(), request.avatarUrl());
        return getProfile(userId);
    }

    public void updateLocale(UUID userId, UserDtos.UpdateLocaleRequest request) {
        userRepository.updateLocale(userId, request.locale());
    }

    /**
     * Finds an existing user by email or creates a minimal user record (no password).
     * Used by lead magnet capture flow where users provide only their email.
     * Returns the user ID.
     */
    @Transactional
    public UUID findOrCreateByEmail(String email) {
        var existing = userRepository.findByEmail(email);
        if (existing != null) {
            return existing.id();
        }
        return userRepository.createMinimal(email);
    }
}
