package ops

import (
	"strings"
	"testing"
)

func TestGeneratePrompt_Plan(t *testing.T) {
	prompt, err := GeneratePrompt("plan", "plan-01-auth.md")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if !strings.Contains(prompt, "The Commander") {
		t.Error("Expected 'The Commander' persona in plan prompt")
	}
	if !strings.Contains(prompt, "plan-01-auth.md") {
		t.Error("Expected filename in prompt")
	}
}

func TestGeneratePrompt_Research(t *testing.T) {
	prompt, err := GeneratePrompt("research", "plan-02-feature.md")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if !strings.Contains(prompt, "The Scout") {
		t.Error("Expected 'The Scout' persona in research prompt")
	}
	if !strings.Contains(prompt, "opusflow map") {
		t.Error("Expected map command reference")
	}
}

func TestGeneratePrompt_Execute(t *testing.T) {
	prompt, err := GeneratePrompt("execute", "plan-03-impl.md")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if !strings.Contains(prompt, "The Builder") {
		t.Error("Expected 'The Builder' persona in execute prompt")
	}
	if !strings.Contains(prompt, "Follow the Plan") {
		t.Error("Expected plan following instruction")
	}
}

func TestGeneratePrompt_Verify(t *testing.T) {
	prompt, err := GeneratePrompt("verify", "plan-04-test.md")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if !strings.Contains(prompt, "The Critic") {
		t.Error("Expected 'The Critic' persona in verify prompt")
	}
	if !strings.Contains(prompt, "Completeness") {
		t.Error("Expected checklist items in verify prompt")
	}
}

func TestGeneratePrompt_Unknown(t *testing.T) {
	_, err := GeneratePrompt("invalid", "file.md")
	if err == nil {
		t.Error("Expected error for unknown action")
	}
	if !strings.Contains(err.Error(), "unknown action") {
		t.Errorf("Expected 'unknown action' error, got: %v", err)
	}
}
