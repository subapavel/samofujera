package cz.samofujera;

import com.tngtech.archunit.core.domain.JavaClass;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

class ModularityTests {

    private static final ApplicationModules modules = ApplicationModules.of(
            SamoFujeraApplication.class,
            JavaClass.Predicates.resideInAPackage("cz.samofujera.generated..")
    );

    @Test
    void verifyModuleStructure() {
        modules.verify();
    }

    @Test
    void printModuleStructure() {
        modules.forEach(System.out::println);
    }

    @Test
    void createModuleDocumentation() {
        new Documenter(modules).writeDocumentation();
    }
}
