package cz.samofujera.auth.internal;

import cz.samofujera.auth.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

class ImpersonationFilter extends OncePerRequestFilter {

    private final CustomUserDetailsService userDetailsService;

    ImpersonationFilter(CustomUserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        var session = request.getSession(false);
        if (session == null) {
            filterChain.doFilter(request, response);
            return;
        }

        var impersonatedId = (UUID) session.getAttribute(ImpersonationController.SESSION_KEY);
        if (impersonatedId == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String method = request.getMethod();
        String path = request.getRequestURI();

        // Allow impersonation control endpoints through (start/stop/status)
        if (path.startsWith("/api/admin/impersonate")) {
            filterChain.doFilter(request, response);
            return;
        }

        // For non-GET requests, block with 403
        if (!"GET".equalsIgnoreCase(method)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("""
                {"data":null,"message":"Read-only impersonation mode"}""");
            return;
        }

        // For GET requests, swap the SecurityContext principal to impersonated user
        var impersonatedUser = userDetailsService.loadUserById(impersonatedId);
        if (impersonatedUser != null) {
            var auth = new UsernamePasswordAuthenticationToken(
                    impersonatedUser, null, impersonatedUser.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Only apply to /api/** paths
        return !request.getRequestURI().startsWith("/api/");
    }
}
