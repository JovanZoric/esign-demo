# Maven Wrapper Quick Reference

The Maven Wrapper is now set up and ready to use. This allows building the project without installing Maven globally.

## What is Maven Wrapper?

Maven Wrapper automatically downloads and uses the correct Maven version specified in the project configuration. This ensures consistent builds across different environments.

## Files Created

- `mvnw` - Unix/Linux/Mac shell script
- `mvnw.cmd` - Windows batch script
- `.mvn/wrapper/maven-wrapper.properties` - Configuration
- `.mvn/wrapper/maven-wrapper.jar` - Wrapper executable (downloaded)

## Usage

### Windows

```cmd
# Build the project
mvnw.cmd clean install

# Run the application
mvnw.cmd spring-boot:run

# Package for deployment
mvnw.cmd clean package -DskipTests

# Run tests
mvnw.cmd test
```

### Linux/Mac

```bash
# Make sure the script is executable (first time only)
chmod +x mvnw

# Build the project
./mvnw clean install

# Run the application
./mvnw spring-boot:run

# Package for deployment
./mvnw clean package -DskipTests

# Run tests
./mvnw test
```

## Benefits

1. **No Maven Installation Required**: Team members don't need to install Maven
2. **Consistent Versions**: Everyone uses the same Maven version (3.9.6)
3. **Simplified Setup**: New developers can build immediately
4. **CI/CD Friendly**: Works great in Docker and build pipelines

## Configuration

Maven version is specified in `.mvn/wrapper/maven-wrapper.properties`:
```properties
distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.6/apache-maven-3.9.6-bin.zip
```

To change Maven version, update the version number in the `distributionUrl`.

## Troubleshooting

**Issue**: "Permission denied" on Linux/Mac
```bash
chmod +x mvnw
```

**Issue**: Wrapper JAR not found
- The JAR will be automatically downloaded on first run
- If download fails, manually download from:
  https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar
- Place in: `.mvn/wrapper/maven-wrapper.jar`

**Issue**: Maven download fails
- Check internet connection
- Set proxy if needed:
  ```bash
  set MAVEN_OPTS=-Dhttp.proxyHost=proxy.company.com -Dhttp.proxyPort=8080
  ```

## IDE Integration

### IntelliJ IDEA
- IntelliJ automatically detects Maven Wrapper
- Use "Maven" tool window as normal

### Eclipse
- Install M2Eclipse plugin
- Import as Maven project
- Eclipse will use the wrapper

### VS Code
- Install "Maven for Java" extension
- Extension will use mvnw automatically

## Verified Working

✅ Maven Wrapper installed and tested
✅ Maven version: 3.9.6
✅ Java version: 17.0.6
✅ Ready for development
