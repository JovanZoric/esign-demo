package com.esign;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties
public class EsignApplication {

    public static void main(String[] args) {
        SpringApplication.run(EsignApplication.class, args);
    }
}
