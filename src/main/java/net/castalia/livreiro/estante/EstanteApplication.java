package net.castalia.livreiro.estante;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class EstanteApplication {

	public static void main(String[] args) {
		SpringApplication.run(EstanteApplication.class, args);
	}

	@RequestMapping("/livreiro")
	String home() {
		return "Estante do Livreiro";
	}

}
